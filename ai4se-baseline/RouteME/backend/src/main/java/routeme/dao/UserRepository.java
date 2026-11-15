package routeme.dao;

import java.util.List;
import java.util.Optional;
import routeme.model.DemoUser;

public interface UserRepository {

    List<DemoUser> findAll();

    Optional<DemoUser> findById(long id);
}